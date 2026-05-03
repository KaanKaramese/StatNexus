declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export { createClient } from '@supabase/supabase-js';
}

declare module 'https://esm.sh/jose@5.9.6' {
  export { SignJWT, jwtVerify } from 'jose';
}
