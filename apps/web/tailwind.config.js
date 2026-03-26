/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--color-primary, #7C3AED)',
                    hover: 'var(--color-primary-hover, #6D28D9)',
                    light: 'var(--color-primary-light, #EDE9FE)',
                },
            },
            keyframes: {
                'slide-up': {
                    '0%': { transform: 'translate(-50%, 100%)', opacity: '0' },
                    '100%': { transform: 'translate(-50%, 0)', opacity: '1' },
                }
            },
            animation: {
                'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }
        },
    },
    plugins: [],
}
