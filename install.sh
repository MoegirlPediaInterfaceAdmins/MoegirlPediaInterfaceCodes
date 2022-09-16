#!/usr/bin/env bash
if [[ "$CODESPACES" == "true" ]]; then
    echo "Running in GitHub Codespaces, preparing nodejs & npm ..."
    rm -rf /opt/nodejs ~/.nvs ~/.nvm ~/.nodejs
    wget https://raw.githubusercontent.com/tj/n/master/bin/n -O /tmp/n 
    N_PRESERVE_NPM=0 sudo bash /tmp/n lts 
    rm /tmp/n
    sudo /usr/local/bin/npm install npm n eslint -g
    sudo /usr/local/bin/npm up -g
    echo "export N_PRESERVE_NPM=1" | tee -a ~/.bashrc
    hash -r
    echo "Nodejs & npm installed."
fi
npm install
