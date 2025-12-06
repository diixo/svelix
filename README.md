# svelix

**Svelix** - start example project, based on `svelte.js` framework.

Install all dependencies:
``` bash
nmp install
```


Fix policy to unblock scripts execution:
``` bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```


Create project:
``` bash
npm create vite@latest . -- --template svelte
```


### Run with Node.js (live-reload) for development-mode:
``` bash
npm run dev
```


### Run without Node.js

Rebuild dist:
``` bash
npm run build
```

``` bash
cd dist
python -m http.server 8000
http://localhost:8000
```
