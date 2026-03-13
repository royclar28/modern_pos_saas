import { useEffect } from 'react';

export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
    useEffect(() => {
        let barcode = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is on an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const currentTime = Date.now();
            if (currentTime - lastKeyTime > 50) {
                // Too long between keystrokes, probably typing instead of scanning
                barcode = '';
            }

            if (e.key === 'Enter') {
                if (barcode.length > 2) {
                    onScan(barcode);
                }
                barcode = '';
            } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                barcode += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan]);
};
