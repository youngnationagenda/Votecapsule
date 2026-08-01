/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html','./src/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: { primary: '#0369A1', primaryLight: '#0EA5E9', primaryDark: '#075985', secondary: '#F0F9FF' } }, fontFamily: { sans: ['Inter','system-ui','sans-serif'] } } }, plugins: [] };
