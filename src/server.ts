import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.get('/api/weather-briefing', async (req, res) => {
  const cityName = req.query['city'] || 'this location';
  const temperature = req.query['temp'] || '';
  const condition = req.query['condition'] || '';

  try {
    const {GoogleGenAI} = await import('@google/genai');
    const apiKey = process.env['GEMINI_API_KEY'];

    if (!apiKey) {
      res.json({
        summary: `Currently ${temperature}°C with ${condition} in ${cityName}.`,
      });
      return;
    }

    const ai = new GoogleGenAI({apiKey});
    const prompt = `Generate a very short (1-2 sentences) friendly weather briefing for ${cityName}. Current conditions: ${temperature}°C, ${condition}. Keep it conversational and under 30 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    res.json({summary: response.text || `Currently ${temperature}°C with ${condition} in ${cityName}.`});
  } catch {
    res.json({
      summary: `Currently ${temperature}°C with ${condition} in ${cityName}.`,
    });
  }
});

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
