import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { actionErrorMessage, isPromise } from '@/shared/api/action-errors';
import { useResetOnToggle } from '@/shared/hooks/useModalForm';
export const ModalActionContext = createContext<{
    pending: boolean;
    run: (action: () => unknown) => void;
} | null>(null);
export const useModalAction = () => useContext(ModalActionContext);
export function useModalActionController(open: boolean) {
    const [pending, setPending] = useState(false), [error, setError] = useState(''), inFlight = useRef(false), generation = useRef(0);
    useResetOnToggle(open, () => { generation.current++; inFlight.current = false; setPending(false); setError(''); });
    const run = useCallback((action: () => unknown) => {
        if (inFlight.current)
            return;
        setError('');
        try {
            const result = action();
            if (!isPromise(result))
                return;
            const current = generation.current;
            inFlight.current = true;
            setPending(true);
            void Promise.resolve(result).catch(error => { if (current === generation.current)
                setError(actionErrorMessage(error)); }).finally(() => { if (current === generation.current) {
                inFlight.current = false;
                setPending(false);
            } });
        }
        catch (error) {
            setError(actionErrorMessage(error));
        }
    }, []);
    return { pending, error, run };
}
