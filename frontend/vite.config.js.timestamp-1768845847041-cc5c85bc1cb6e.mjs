// vite.config.js
import { defineConfig } from "file:///C:/Users/vishu/Desktop/codeview-main/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/vishu/Desktop/codeview-main/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/vishu/Desktop/codeview-main/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    // Allow access from network,
    allowedHosts: ["a2c01154623f.ngrok-free.app"],
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true
      },
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aXNodVxcXFxEZXNrdG9wXFxcXGNvZGV2aWV3LW1haW5cXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHZpc2h1XFxcXERlc2t0b3BcXFxcY29kZXZpZXctbWFpblxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdmlzaHUvRGVza3RvcC9jb2Rldmlldy1tYWluL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6ICcwLjAuMC4wJywgLy8gQWxsb3cgYWNjZXNzIGZyb20gbmV0d29yayxcclxuICAgIGFsbG93ZWRIb3N0czogWydhMmMwMTE1NDYyM2Yubmdyb2stZnJlZS5hcHAnXSxcclxuICAgIHBvcnQ6IDUxNzMsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL3NvY2tldC5pbyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICBzb3VyY2VtYXA6IHRydWVcclxuICB9XHJcbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFxVSxTQUFTLG9CQUFvQjtBQUNsVyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7QUFBQSxFQUNoQyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUNOLGNBQWMsQ0FBQyw2QkFBNkI7QUFBQSxJQUM1QyxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxjQUFjO0FBQUEsUUFDWixRQUFRO0FBQUEsUUFDUixJQUFJO0FBQUEsUUFDSixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsRUFDYjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
