# Запуск проекта

Требуется Node.js 20.19 или новее и Ollama с моделью `qwen2.5-coder:1.5b`.

```powershell
npm install
ollama pull qwen2.5-coder:1.5b
$env:PORT = "5173"
npm run dev -- --host 0.0.0.0
```

Откройте http://localhost:5173. Ollama должна работать на http://127.0.0.1:11434.

Для временной публикации через Cloudflare Tunnel используйте:

```powershell
$env:PUBLIC_TUNNEL_HOST = "ваш-домен.trycloudflare.com"
cloudflared tunnel --url http://localhost:5173
```

Затем перезапустите Vite с переменной `PUBLIC_TUNNEL_HOST` и откройте выданную HTTPS-ссылку.
