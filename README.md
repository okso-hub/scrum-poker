# Scrum Poker



## Compose 
services:
  agileace:
    image: ghcr.io/okso-hub/agileace:latest
    pull_policy: always           
    restart: always               
    ports:
      - "8100:3000"                  
    environment:
      HOST: "0.0.0.0"       
      PORT: "3000"          

  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300       
    restart: always
