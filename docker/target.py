#!/usr/bin/env python3

#
# This file is part of LiteX-Boards.
#
# Copyright (c) Greg Davill <greg.davill@gmail.com>
# SPDX-License-Identifier: BSD-2-Clause

import json

from migen import *
from migen.genlib.misc import WaitTimer
from migen.genlib.resetsync import AsyncResetSynchronizer
from migen.genlib.cdc import MultiReg

from litex_boards.platforms import gsd_orangecrab

from litex.build.lattice.trellis import trellis_args, trellis_argdict

from litex.soc.cores.clock import *
from litex.soc.integration.soc_core import *
from litex.soc.integration.builder import *
from litex.soc.cores.led import LedChaser
from litex.soc.cores.gpio import GPIOTristate
from litex.soc.cores.timer import Timer

from litedram.modules import MT41K64M16, MT41K128M16, MT41K256M16, MT41K512M16
from litedram.phy import ECP5DDRPHY

from litex.build.generic_platform import Pins, IOStandard
from litex.soc.interconnect.csr import *

# CRG ---------------------------------------------------------------------------------------------

class _CRG(Module):
    def __init__(self, platform, sys_clk_freq, with_usb_pll=False):
        self.rst = Signal()
        self.clock_domains.cd_por = ClockDomain()
        self.clock_domains.cd_sys = ClockDomain()

        # # #

        # Clk / Rst
        clk48 = platform.request("clk48")
        rst_n = platform.request("usr_btn", loose=True)
        if rst_n is None: rst_n = 1

        # Power on reset
        por_count = Signal(16, reset=2**16-1)
        por_done  = Signal()
        self.comb += self.cd_por.clk.eq(clk48)
        self.comb += por_done.eq(por_count == 0)
        self.sync.por += If(~por_done, por_count.eq(por_count - 1))

        # PLL
        self.submodules.pll = pll = ECP5PLL()
        self.comb += pll.reset.eq(~por_done | ~rst_n | self.rst)
        pll.register_clkin(clk48, 48e6)
        pll.create_clkout(self.cd_sys, sys_clk_freq)

        # USB PLL
        if with_usb_pll:
            self.clock_domains.cd_usb_12 = ClockDomain()
            self.clock_domains.cd_usb_48 = ClockDomain()
            usb_pll = ECP5PLL()
            self.submodules += usb_pll
            self.comb += usb_pll.reset.eq(~por_done)
            usb_pll.register_clkin(clk48, 48e6)
            usb_pll.create_clkout(self.cd_usb_48, 48e6)
            usb_pll.create_clkout(self.cd_usb_12, 12e6)

        # FPGA Reset (press usr_btn for 1 second to fallback to bootloader)
        reset_timer = WaitTimer(int(48e6))
        reset_timer = ClockDomainsRenamer("por")(reset_timer)
        self.submodules += reset_timer
        self.comb += reset_timer.wait.eq(~rst_n)
        self.comb += platform.request("rst_n").eq(~reset_timer.done)


class _CRGSDRAM(Module):
    def __init__(self, platform, sys_clk_freq, with_usb_pll=False):
        self.rst = Signal()
        self.clock_domains.cd_init     = ClockDomain()
        self.clock_domains.cd_por      = ClockDomain()
        self.clock_domains.cd_sys      = ClockDomain()
        self.clock_domains.cd_sys2x    = ClockDomain()
        self.clock_domains.cd_sys2x_i  = ClockDomain()

        # # #

        self.stop  = Signal()
        self.reset = Signal()

        # Clk / Rst
        clk48 = platform.request("clk48")
        rst_n = platform.request("usr_btn", loose=True)
        if rst_n is None: rst_n = 1

        # Power on reset
        por_count = Signal(16, reset=2**16-1)
        por_done  = Signal()
        self.comb += self.cd_por.clk.eq(clk48)
        self.comb += por_done.eq(por_count == 0)
        self.sync.por += If(~por_done, por_count.eq(por_count - 1))

        # PLL
        sys2x_clk_ecsout = Signal()
        self.submodules.pll = pll = ECP5PLL()
        self.comb += pll.reset.eq(~por_done | ~rst_n | self.rst)
        pll.register_clkin(clk48, 48e6)
        pll.create_clkout(self.cd_sys2x_i, 2*sys_clk_freq)
        pll.create_clkout(self.cd_init, 24e6)
        self.specials += [
            Instance("ECLKBRIDGECS",
                i_CLK0   = self.cd_sys2x_i.clk,
                i_SEL    = 0,
                o_ECSOUT = sys2x_clk_ecsout),
            Instance("ECLKSYNCB",
                i_ECLKI = sys2x_clk_ecsout,
                i_STOP  = self.stop,
                o_ECLKO = self.cd_sys2x.clk),
            Instance("CLKDIVF",
                p_DIV     = "2.0",
                i_ALIGNWD = 0,
                i_CLKI    = self.cd_sys2x.clk,
                i_RST     = self.reset,
                o_CDIVX   = self.cd_sys.clk),
            AsyncResetSynchronizer(self.cd_sys, ~pll.locked | self.reset),
        ]

        # USB PLL
        if with_usb_pll:
            self.clock_domains.cd_usb_12 = ClockDomain()
            self.clock_domains.cd_usb_48 = ClockDomain()
            usb_pll = ECP5PLL()
            self.submodules += usb_pll
            self.comb += usb_pll.reset.eq(~por_done)
            usb_pll.register_clkin(clk48, 48e6)
            usb_pll.create_clkout(self.cd_usb_48, 48e6)
            usb_pll.create_clkout(self.cd_usb_12, 12e6)

        # FPGA Reset (press usr_btn for 1 second to fallback to bootloader)
        reset_timer = WaitTimer(int(48e6))
        reset_timer = ClockDomainsRenamer("por")(reset_timer)
        self.submodules += reset_timer
        self.comb += reset_timer.wait.eq(~rst_n)
        self.comb += platform.request("rst_n").eq(~reset_timer.done)

class CustomVeilogModule(Module, AutoCSR):
    def __init__(self, platform, module, io, used_gpios):
        io_dict = {}

        for port in io:
            # If signal type is a clock, provide the system clock as an input to the Veilog module
            if port["type"] == "clock":
                io_dict[f"i_{port['name']}"] = ClockSignal()

            elif port["type"] == "csr":
                csr_name = port["name"] + "_csr"
                
                # For a CSR output, create a CSRStatus and connect the status
                # to the relevant output of the Verilog module's
                if port["direction"] == "output":
                    setattr(
                        self,
                        csr_name,
                        CSRStatus(port["width"], name = port["name"])
                    )
                    io_dict[f"o_{port['name']}"] = getattr(self, csr_name).status

                # For a CSR input, create a CSRStorage and connect the storage to the relevant
                # input of the Verilog module
                elif port["direction"] == "input":
                    setattr(
                        self,
                        csr_name,
                        CSRStorage(port["width"], name = port["name"])
                    )
                    io_dict[f"i_{port['name']}"] = getattr(self, csr_name).storage

                else:
                    raise SyntaxError("Port direction must be input or output.")

            elif port["type"] == "gpio":
                used_gpios += [port["pin"]]

                if port["direction"] == "output":
                    io_dict[f"o_{port['name']}"] = platform.request(f"GPIO_{port['pin']}")
                elif port["direction"] == "input":
                    io_dict[f"i_{port['name']}"] = platform.request(f"GPIO_{port['pin']}")
                else:
                    raise SyntaxError("Port direction must be input or output.")

            else:
                raise SyntaxError("Custom module IO must be either 'clock', 'csr' or 'gpio'.")
        
        print(io_dict)
        self.specials += Instance(module, **io_dict)

# BaseSoC ------------------------------------------------------------------------------------------

class BaseSoC(SoCCore):
    def __init__(self, revision="0.2", device="25F", sdram_device="MT41K64M16",
                 sys_clk_freq=int(48e6), toolchain="trellis", with_led_chaser=True, **kwargs):
        platform = gsd_orangecrab.Platform(revision=revision, device=device ,toolchain=toolchain)

        # CRG --------------------------------------------------------------------------------------
        crg_cls      = _CRGSDRAM if kwargs.get("integrated_main_ram_size", 0) == 0 else _CRG
        self.submodules.crg = crg_cls(platform, sys_clk_freq, with_usb_pll=True)

        # SoCCore ----------------------------------------------------------------------------------
        # Defaults to USB ACM through ValentyUSB.
        kwargs["uart_name"] = "usb_acm"
        SoCCore.__init__(self, platform, sys_clk_freq, ident="LiteX SoC on OrangeCrab", **kwargs)

        # DDR3 SDRAM -------------------------------------------------------------------------------
        if not self.integrated_main_ram_size:
            available_sdram_modules = {
                "MT41K64M16":  MT41K64M16,
                "MT41K128M16": MT41K128M16,
                "MT41K256M16": MT41K256M16,
                "MT41K512M16": MT41K512M16,
            }
            sdram_module = available_sdram_modules.get(sdram_device)

            ddram_pads = platform.request("ddram")
            self.submodules.ddrphy = ECP5DDRPHY(
                pads         = ddram_pads,
                sys_clk_freq = sys_clk_freq,
                dm_remapping = {0:1, 1:0},
                cmd_delay    = 0 if sys_clk_freq > 64e6 else 100)
            self.ddrphy.settings.rtt_nom = "disabled"
            if hasattr(ddram_pads, "vccio"):
                self.comb += ddram_pads.vccio.eq(0b111111)
            if hasattr(ddram_pads, "gnd"):
                self.comb += ddram_pads.gnd.eq(0)
            self.comb += self.crg.stop.eq(self.ddrphy.init.stop)
            self.comb += self.crg.reset.eq(self.ddrphy.init.reset)
            self.add_sdram("sdram",
                phy           = self.ddrphy,
                module        = sdram_module(sys_clk_freq, "1:2"),
                l2_cache_size = kwargs.get("l2_size", 8192)
            )

        # Leds -------------------------------------------------------------------------------------
        led_pads = platform.request_all("user_led")
        if with_led_chaser:
            self.submodules.leds = LedChaser(
                pads         = led_pads,
                sys_clk_freq = sys_clk_freq)
        
        # GPIO Setup -------------------------------------------------------------------------------
        GPIO_MAP = {
            # Board Name : FPGA Pin Name
            "A0":   "L4",
            "A1":   "N3",
            "A2":   "N4",
            "A3":   "H4",
            "A4":   "G4",
            "A5":   "T17",
            "SCK":  "R17",
            "MOSI": "N16",
            "MISO": "N15",
            "0":    "N17",
            "1":    "M18",
            "SDA":  "C10",
            "SCL":  "C9",
            "5":    "B10",
            "6":    "B9",
            "9":    "C8",
            "10":   "B8",
            "11":   "A8",
            "12":   "H2",
            "13":   "J2",
        }

        for board_name in GPIO_MAP:
            platform.add_extension([
                (f"GPIO_{board_name}", 0, Pins(GPIO_MAP[board_name]), IOStandard("LVCMOS33")),
            ])

        used_gpios = []

        # Timer ------------------------------------------------------------------------------------
        self.submodules.timer = Timer()

        # Custom Hardware --------------------------------------------------------------------------
        with open("/home/ben/scratch/mfsc_config.json") as f:
            config_file = json.load(f)

        if "custom_verilog_files" in config_file:
            for custom_file in config_file["custom_verilog_files"]:
                platform.add_source(custom_file)

        module_counter = {}

        if "custom_verilog_modules" in config_file:
            for custom_module in config_file["custom_verilog_modules"]:
                if custom_module["module"] not in module_counter:
                    module_counter[custom_module["module"]] = 0
                else:
                    module_counter[custom_module["module"]] += 1

                submodule_name = custom_module["module"] + "_" + str(module_counter[custom_module["module"]])

                setattr(
                    self.submodules,
                    submodule_name,
                    CustomVeilogModule(
                        platform,
                        custom_module["module"],
                        custom_module["io"],
                        used_gpios
                    )
                )

        # setattr(
        #     self.submodules,
        #     platform_extension_name,
        #     GPIOTristate(platform.request(platform_extension_name))
        # )


# Build --------------------------------------------------------------------------------------------

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
    builder = Builder(soc, **builder_argdict(args))
    builder_kargs = trellis_argdict(args) if args.toolchain == "trellis" else {}
    if args.build:
        builder.build(**builder_kargs)

    if args.load:
        prog = soc.platform.create_programmer()
        prog.load_bitstream(builder.get_bitstream_filename(mode="sram"))

if __name__ == "__main__":
    main()
