FROM ubuntu:20.04

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y wget python3 python3-pip git

RUN wget https://github.com/YosysHQ/oss-cad-suite-build/releases/download/2022-02-05/oss-cad-suite-linux-x64-20220205.tgz
RUN tar zxvf oss-cad-suite-linux-x64-20220205.tgz
RUN rm oss-cad-suite-linux-x64-20220205.tgz

RUN wget https://github.com/riscv-collab/riscv-gnu-toolchain/releases/download/2022.01.17/riscv64-elf-ubuntu-20.04-nightly-2022.01.17-nightly.tar.gz
RUN tar zxvf riscv64-elf-ubuntu-20.04-nightly-2022.01.17-nightly.tar.gz
RUN rm riscv64-elf-ubuntu-20.04-nightly-2022.01.17-nightly.tar.gz

RUN pip3 install meson ninja
RUN mkdir /litex && cd /litex && wget https://raw.githubusercontent.com/enjoy-digital/litex/master/litex_setup.py && chmod +x litex_setup.py && ./litex_setup.py --init --install

ENV PATH /oss-cad-suite/bin:/riscv/bin:$PATH