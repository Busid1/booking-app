module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      fontSize: {
        'md': '15px', // 14px
      }
    }
  },
  plugins: [
    require('flowbite/plugin')
  ],
}