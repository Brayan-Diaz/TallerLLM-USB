# ¿Qué hay detrás de un LLM? — Taller para colegios

Taller interactivo de 5 niveles para estudiantes de colegio, Universidad de San Buenaventura Cali · Facultad de Ingeniería.
Corre completamente en el navegador, sin servidor ni instalación.

**Abrir el taller:** https://brayan-diaz.github.io/TallerLLM-USB/

## Niveles

| # | Nivel | Idea |
|---|-------|------|
| 1 | Autocompleta | Un modelo de lenguaje adivina la siguiente palabra contando qué palabra suele seguir a cuál. |
| 2 | El mapa de las palabras | Cada palabra es un vector de 300 números; el mapa 2D es solo una sombra de ese espacio. |
| 3 | Calculadora de palabras | Suma y resta de vectores: rey − hombre + mujer ≈ reina. |
| 4 | Entrena la neurona | Una neurona real (regresión logística) aprende ajustando 300 pesos. |
| 5 | Temperatura y alucinaciones | Softmax con temperatura: de respuestas seguras a respuestas creativas (y falsas). |

## Datos reales

Los vectores son reales: modelo `es_core_news_lg` de spaCy (fastText, 300 dimensiones), 290 palabras en español.
Se extrajeron en Google Colab; la proyección 2D usa PCA.

## Estructura

```
index.html                 pantalla de inicio
nivel1_…nivel5_….html      un archivo por nivel
css/                       estilos (base.css es común; el resto, por nivel)
js/                        lógica de cada nivel (nivel1.js … nivel5.js, index.js)
data/                      vectores_nivel2/3 (.js para el navegador y .json reutilizable) y corpus del nivel 1
assets/                    logos de la Universidad
```

Los archivos `data/*.js` contienen los mismos datos que los `.json`; se usan como `.js` para que el taller también funcione abriendo
`index.html` con doble clic (los navegadores bloquean `fetch` de archivos locales).

## Uso local

Abre `index.html` en el navegador (Chrome o Edge recomendados). El progreso se guarda en el navegador (`localStorage`).

## Autor

Brayan Díaz · Universidad de San Buenaventura Cali
