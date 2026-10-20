#!/bin/sh
# Gera wordpress/truco-online.zip para instalar em Plugins > Adicionar plugin > Enviar plugin
set -e
cd "$(dirname "$0")"
rm -rf build truco-online.zip
mkdir -p build/truco-online
cp truco-online/*.php build/truco-online/
cp -r ../jogo build/truco-online/jogo
rm -rf build/truco-online/jogo/servidor build/truco-online/jogo/testes
(cd build && zip -qr ../truco-online.zip truco-online)
rm -rf build
echo "Pacote gerado: wordpress/truco-online.zip"
