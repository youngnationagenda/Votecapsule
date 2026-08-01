/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html','./src/**/*.{ts,tsx}'], theme: { extend: { colors: { brand: { primary: '#D97706', primaryLight: '#F59E0B', primaryDark: '#B45309', secondary: '#FFFBEB' } }, fontFamily: { sans: ['Inter','system-ui','sans-serif'] } } }, plugins: [] };
