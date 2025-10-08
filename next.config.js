/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/chats/:id',
        destination: '/chat/:id',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
