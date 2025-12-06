# svelix

**Svelix** - start example project, based on `svelte.js` framework.


Create project:
``` bash
npm create vite@latest . -- --template svelte
```

Fix policy to unblock scripts execution:
``` bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Rebuild dist
``` bash
npm run build
```

### Run without Node.js
``` bash
cd dist
python -m http.server 8000
http://localhost:8000
```
