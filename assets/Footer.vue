<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="status-indicator">
          <span class="status-dot"></span>
          Cloudflare Edge Connected
        </span>
      </div>

      <div class="footer-links">
        <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="footer-link">
          <svg class="footer-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          <span>GitHub</span>
        </a>
      </div>

      <div class="footer-meta">
        <span>&copy; {{ currentYear }} FlareDrive-R2 Cloud. All rights reserved.</span>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: "Footer",
  data() {
    return {
      githubUrl: "https://github.com/LiYiCha",
      currentYear: new Date().getFullYear()
    };
  }
};
</script>

<style scoped>
.site-footer {
  margin-top: 48px;
  width: 100%;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  padding: 24px 20px;
  box-sizing: border-box;
  font-size: 13px;
  color: #64748b;
}

.footer-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

@media (min-width: 640px) {
  .footer-inner {
    flex-direction: row;
    justify-content: space-between;
  }
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: #0f172a;
}

.footer-icon {
  flex-shrink: 0;
}

.footer-meta {
  font-size: 12px;
  color: #94a3b8;
}
</style>