import { createApp } from "vue";
import "./lib/request.js";
import "./styles/main.css";
import "./admin/admin.css";
import Admin from "./Admin.vue";

createApp(Admin).mount("#app");
