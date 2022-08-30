#!/usr/bin/env bash
if [[ "$CODESPACES" == "true" ]]; then
    echo "Running in GitHub Codespaces, preparing nodejs & npm ..."
    wget https://raw.githubusercontent.com/tj/n/master/bin/n -O /tmp/n 
    sudo N_PRESERVE_NPM=0 bash /tmp/n lts 
    rm /tmp/n
    sudo npm install n eslint -g
    sudo npm up -g
    echo \"export N_PRESERVE_NPM=1\" | sudo tee -a /root/.bashrc
    echo "Nodejs & npm installed."
fi
npm install
