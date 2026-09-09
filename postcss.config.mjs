const config = {
  plugins: process.env.WORTNAH_VERIFY_ONLY === "1"
    ? {}
    : { "@tailwindcss/postcss": {} },
};

export default config;
