from litex_boards.targets.gsd_orangecrab import BaseSoC
from litex.soc.integration.builder import *

soc = BaseSoC(
        toolchain    = "trellis",
        revision     = "0.2",
        device       = "85F",
        sdram_device = "MT41K64M16",
        sys_clk_freq = int(float(48e6)))

# soc.add_spi_sdcard()

builder = Builder(soc)
# builder_kargs = trellis_argdict(args) if args.toolchain == "trellis" else {}
builder.build({})