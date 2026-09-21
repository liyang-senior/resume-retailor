import { getConfiguredProviders, resolveDefaultProvider } from "@/lib/ai/ai-service";

// Exposes which AI providers are configured (booleans only, never secrets)
// so the frontend can default the provider picker to whatever actually works
// without the user having to know or select anything.
export default function handler(req, res) {
  res.status(200).json({
    defaultProvider: resolveDefaultProvider(),
    available: getConfiguredProviders(),
  });
}
