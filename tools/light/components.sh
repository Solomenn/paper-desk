#!/bin/bash
# 渲染三张线性分量（太阳 / 天光 / 反射光，各开一个），给 fit_lights.py 用
# 用法：bash tools/light/components.sh "额外参数，如 ang=0.5" [宽] [高]
OUT=${LIGHT_OUT:-tools/light/out}; mkdir -p "$OUT"; W=${2:-570}; H=${3:-570}
Q="raw=1&ao=0&$1"; R="$(dirname "$0")/render.js"
node "$R" "$Q&sky=0&bounce=0&sun=1" "$OUT/c_sun.png" $W $H &
node "$R" "$Q&sun=0&bounce=0&sky=1" "$OUT/c_sky.png" $W $H &
node "$R" "$Q&sun=0&sky=0&bounce=1" "$OUT/c_bnc.png" $W $H &
wait
