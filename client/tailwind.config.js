/* Tailwind build config (same theme the page used via the CDN).
   Build:  npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind-input.css -o tailwind.css --minify */
module.exports = {
  content: ['./index.html', './script.js', './motion.js'],
  theme: {
    extend: {
      colors: { hgreen:'#006A50', forest:'#063B2A', darkgrn:'#0B3D2E', gold:'#C8A951', cream:'#F7F5ED', offwhite:'#FCFCF8', charcoal:'#1D2722' },
      fontFamily: { display: ['"Fraunces"', 'serif'], body: ['"Inter"', 'sans-serif'] },
    },
  },
};
