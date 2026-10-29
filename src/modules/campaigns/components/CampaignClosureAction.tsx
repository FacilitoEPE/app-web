import { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import AppModal from '@/shared/components/AppModal';
import InputField from '@/shared/components/InputField';
import { Button } from '@/shared/components/ui/button';
import { usesV1, commitRemote } from '@/shared/api/data-contract';
import { cerrarCampanaV1 } from '@/modules/campaigns/api/future-actions.api';
export default function CampaignClosureAction({ campaignId, closed, onClosed }: {
    campaignId: number;
    closed: boolean;
    onClosed: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    if (!usesV1() || closed)
        return null;
    const close = async () => {
        if (!reason.trim())
            throw new Error('Ingresa el motivo de cierre.');
        await commitRemote(() => cerrarCampanaV1(campaignId, reason.trim()));
        setOpen(false);
        onClosed();
    };
    return <>
    <Button variant="outline" size="xl" onClick={() => { setReason(''); setOpen(true); }}><CheckCheck size={19}/> Cerrar campaña</Button>
    <AppModal open={open} onOpenChange={setOpen} icon={<CheckCheck />} title="Cerrar campaña" description="Se comprobarán las cargas, liquidaciones y facturas pendientes antes de cerrar." footer={<Button size="xl" onClick={close}>Confirmar cierre</Button>}>
      <InputField id="motivo-cierre" label="Motivo de cierre" required value={reason} onChange={setReason}/>
    </AppModal>
  </>;
}
