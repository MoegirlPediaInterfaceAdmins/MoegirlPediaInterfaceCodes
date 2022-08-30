#!/usr/bin/env bash
if [[ "$CODESPACES" == "true" ]]; then
    wget https://raw.githubusercontent.com/tj/n/master/bin/n -O /tmp/n 
    sudo N_PRESERVE_NPM=0 bash /tmp/n lts 
    rm /tmp/n
    sudo npm install n eslint --location=global 
    sudo npm up --location=global 
    echo \"export N_PRESERVE_NPM=1\" | sudo tee -a /root/.bashrc
fi
npm install
