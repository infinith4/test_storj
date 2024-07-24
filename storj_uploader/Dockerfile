# FROM mcr.microsoft.com/devcontainers/rust:1-1-bullseye
FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm
# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends sudo curl emacs

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules

RUN su node -c "sudo -v ; curl https://rclone.org/install.sh | sudo bash"

RUN su node -c "npm install -g npm@10.8.0"

COPY .rcloneconf /home/node/.config/rclone/rclone.conf