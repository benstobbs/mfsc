from migen import *

from litex_boards.platforms import gsd_orangecrab

from litex.build.lattice.trellis import trellis_args, trellis_argdict

from litex.soc.cores.clock import *
from litex.soc.integration.soc_core import *
from litex.soc.integration.builder import *
from litex.soc.cores.gpio import GPIOOut
from litex.soc.cores.timer import Timer

from litex.build.generic_platform import Pins, IOStandard

from litex_boards.targets.gsd_orangecrab import BaseSoC

def main():
    from litex.soc.integration.soc import LiteXSoCArgumentParser
    parser = LiteXSoCArgumentParser(description="LiteX SoC on OrangeCrab")
    target_group = parser.add_argument_group(title="Target options")
    target_group.add_argument("--build",           action="store_true",  help="Build design.")
    target_group.add_argument("--load",            action="store_true",  help="Load bitstream.")
    target_group.add_argument("--toolchain",       default="trellis",    help="FPGA toolchain (trellis or diamond).")
    target_group.add_argument("--sys-clk-freq",    default=48e6,         help="System clock frequency.")
    target_group.add_argument("--revision",        default="0.2",        help="Board Revision (0.1 or 0.2).")
    target_group.add_argument("--device",          default="25F",        help="ECP5 device (25F, 45F or 85F).")
    target_group.add_argument("--sdram-device",    default="MT41K64M16", help="SDRAM device (MT41K64M16, MT41K128M16, MT41K256M16 or MT41K512M16).")
    target_group.add_argument("--with-spi-sdcard", action="store_true",  help="Enable SPI-mode SDCard support.")
    builder_args(parser)
    soc_core_args(parser)
    trellis_args(parser)
    args = parser.parse_args()

    soc = BaseSoC(
        toolchain    = args.toolchain,
        revision     = args.revision,
        device       = args.device,
        sdram_device = args.sdram_device,
        sys_clk_freq = int(float(args.sys_clk_freq)),
        **soc_core_argdict(args))
    if args.with_spi_sdcard:
        soc.add_spi_sdcard()

    platform = gsd_orangecrab.Platform(
        revision = args.revision,
        device = args.device,
        toolchain = args.toolchain
    )

    # GPIO
    connectors = gsd_orangecrab._connectors_r0_2 if args.revision == "0.2" else gsd_orangecrab._connectors_r0_1
    gpio_connectors = [c for c in connectors if c[0] == "GPIO"][0][1]

    for i, gpio_connector in enumerate(gpio_connectors.split(" ")):
        if gpio_connector != "-":
            platform.add_extension([
                (f"gpio_{i}", 0, Pins(gpio_connector), IOStandard("LVCMOS33")),
            ])

    soc.submodules.gpio = GPIOOut(platform.request("gpio_0"))

    # Timer
    soc.submodules.timer = Timer()


    builder = Builder(soc, **builder_argdict(args))
    builder_kargs = trellis_argdict(args) if args.toolchain == "trellis" else {}
    if args.build:
        builder.build(**builder_kargs)

    if args.load:
        prog = soc.platform.create_programmer()
        prog.load_bitstream(builder.get_bitstream_filename(mode="sram"))

if __name__ == "__main__":
    main()
