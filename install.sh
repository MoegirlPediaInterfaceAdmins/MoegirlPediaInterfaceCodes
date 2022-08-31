#!/usr/bin/env bash
if [[ "$CODESPACES" == "true" ]]; then
    echo "Running in GitHub Codespaces, preparing nodejs & npm ..."
    rm -rf /opt/nodejs ~/.nvs ~/.nvm ~/.nodejs
    wget https://raw.githubusercontent.com/tj/n/master/bin/n -O /tmp/n 
    sudo N_PRESERVE_NPM=0 bash /tmp/n lts 
    rm /tmp/n
    sudo npm install npm n eslint -g
    sudo npm up -g
    echo "export N_PRESERVE_NPM=1" | tee -a ~/.bashrc
    hash -r
    echo "Nodejs & npm installed."
fi
npm install
