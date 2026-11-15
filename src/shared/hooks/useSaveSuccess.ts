import { createContext, useContext } from "react";

export const SaveSuccessContext = createContext<(title: string, description: string) => void>(() => {});

export const useSaveSuccess = () => useContext(SaveSuccessContext);
