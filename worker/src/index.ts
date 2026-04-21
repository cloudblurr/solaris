import { Container } from "@cloudflare/containers";

// NimbusAI Container class — wraps the Next.js app
export class NimbusAI extends Container {
  defaultPort = 3000;
  sleepAfter = "5m";

  envVars = {
    NODE_ENV: "production",
    PORT: "3000",
  };

  override onStart() {
    console.log("[NimbusAI] Container started");
  }

  override onStop() {
    console.log("[NimbusAI] Container stopped");
  }

  override onError(error: unknown) {
    console.error("[NimbusAI] Container error:", error);
  }
}

// Worker fetch handler — proxies all requests to the container
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = env.NIMBUSAI.getByName("nimbusai-prod");
    return await container.fetch(request);
  },
};

interface Env {
  NIMBUSAI: DurableObjectNamespace;
}
