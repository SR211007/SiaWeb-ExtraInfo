# SiaWeb-ExtraInfo

Esta extensión agrega columnas calculadas directamente sobre la tabla del boletín de calificaciones de la plataforma Siaweb.

## Qué hace

La extensión detecta la tabla de calificaciones y añade estas columnas nuevas por cada materia:

- **Def. exacta**: calcula la definitiva real usando los porcentajes y notas visibles, sin mostrar la aproximación que hace la plataforma.
- **% evaluado**: suma el porcentaje que ya tiene nota registrada.
- **% faltante**: muestra cuánto porcentaje falta para completar el 100%.
- **Nota faltante para 3**: calcula qué nota necesitas sacar en el porcentaje restante para terminar la materia en 3.0.

## Cómo calcula los datos

### Def. exacta

La definitiva exacta se calcula con la suma ponderada de cada evaluación:

```text
Def. exacta = (nota1 × porcentaje1 + nota2 × porcentaje2 + ...) / 100
```

Ejemplo:

```text
20% con 4.0 + 30% con 3.5 + 10% con 2.0
= (4.0×20 + 3.5×30 + 2.0×10) / 100
= 2.05
```

Si la plataforma muestra la definitiva redondeada, esta columna muestra el valor exacto calculado a partir de las notas visibles.

### % evaluado

Suma todos los porcentajes que ya tienen una nota cargada.

### % faltante

Se calcula así:

```text
% faltante = 100 - % evaluado
```

### Nota faltante para 3

Asume que en todo el porcentaje que falta vas a sacar la misma nota, y calcula la mínima necesaria para terminar con 3.0.

```text
Nota faltante = (300 - suma(nota × porcentaje)) / % faltante
```

Donde `300` equivale a `3.0 × 100`.

Resultados posibles:

- `0`: ya alcanzas 3.0 o más.
- Un valor como `4.25`: esa es la nota mínima que necesitas en lo pendiente.
- `>5.0`: ni sacando 5.0 alcanzas a llegar a 3.0.
- `No alcanza`: ya no queda porcentaje pendiente y todavía no llegas a 3.0.

## Archivos de la extensión

La carpeta de la extensión debe quedar así:

```text
SiaWeb-ExtraInfo/
├─ manifest.json
└─ content.js
```

## Instalación en Chrome

1. Abre Chrome.
2. Entra a `chrome://extensions/`.
3. Activa el **Modo desarrollador** en la esquina superior derecha.
4. Haz clic en **Cargar descomprimida**.
5. Selecciona la carpeta de la extensión.
6. Abre la página del boletín del ITM.


## Compatibilidad

La extensión está pensada para la tabla del boletín de calificaciones donde aparecen las columnas:

- Asignatura
- Grupo
- Créditos
- Varias parejas de porcentaje y nota
- Hab.
- Def.
- Resultado

Si Siaweb cambia su estructura HTML de la tabla, puede tocar ajustar el `content.js`.

## Uso

Una vez instalada:

1. Abre el boletín.
2. Desplázate horizontalmente si no ves las columnas nuevas de inmediato.
3. Revisa por materia la definitiva exacta, lo que ya llevas evaluado, lo que te falta y la nota que necesitarías para pasar en 3.0.

## Notas

- La extensión no modifica las notas en la plataforma.
- Solo agrega columnas visuales en tu navegador.
- Los cálculos dependen de las notas y porcentajes que ya estén visibles en la tabla.
- Si una evaluación todavía no tiene nota, no se suma como porcentaje evaluado.
