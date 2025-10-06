// lib/yamaps-loader.ts
let loadPromise: Promise<any> | null = null;

export function loadYMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window is undefined'));
  // @ts-ignore
  if (window.ymaps3) return Promise.resolve((window as any).ymaps3);

  if (!loadPromise) {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY;
    if (!apiKey) {
      return Promise.reject(new Error('NEXT_PUBLIC_YANDEX_MAPS_KEY is missing'));
    }
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        // @ts-ignore
        const ymaps3 = (window as any).ymaps3;
        if (!ymaps3) return reject(new Error('ymaps3 not found on window'));
        resolve(ymaps3);
      };
      script.onerror = () => reject(new Error('Failed to load Yandex Maps script'));
      document.head.appendChild(script);
    });
  }
  return loadPromise!;
}
