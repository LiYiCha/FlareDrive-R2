import {get_auth_status} from "@/utils/auth";

export async function onRequest(context) {
   if(!await get_auth_status(context)){
    return new Response("没有操作权限", {
        status: 401,
    });
   }
    
    return new Response("access", {
        status: 200,
    });
}