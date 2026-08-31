export {};

declare global {
    interface Window {
        mermaid: {
            initialize: (config: Record<string, unknown>) => void;
            render: (id: string, text: string, container?: Element) => Promise<{
                svg: string;
                bindFunctions?: (element: Element) => void;
            }>;
        };
    }
}

