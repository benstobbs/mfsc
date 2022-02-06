import { execFile, execFileSync, ExecFileException } from 'child_process';
import { existsSync } from 'fs';
import path = require('path');
import { commands, ExtensionContext, ProgressLocation, window } from 'vscode';
import { getBuildFolder } from './helpers';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand('mfsc.compileSoC', compileSoC));
	context.subscriptions.push(commands.registerCommand('mfsc.uploadSoC', uploadSoC));
}

export function deactivate() {}

function compileSoC() {
	const buildFolder = getBuildFolder();

	if (buildFolder){		
		// ensure container clock is synchrononised with host
		execFileSync("docker", ["run", "--rm", "--privileged", "benstobbs/litex-runner", "hwclock", "-s"]);

		const args = [
			"run",
			"--rm",
			"-v",
			`${buildFolder}:/project`,
			"benstobbs/litex-runner",
			"python3",
			"/litex/litex-boards/litex_boards/targets/gsd_orangecrab.py",
			"--device", "85F",
			"--build",
			"--output-dir",
			"/project/"
		];

		return window.withProgress({
			location: ProgressLocation.Notification,
			title: "Building SoC",
			cancellable: false
		}, () => {	
			const p = new Promise<void>(resolve => {
				execFile("docker", args, {maxBuffer: 100 * 1024 * 1024}, (error: ExecFileException | null) => {
					if (error){
						window.showErrorMessage(error.message);
					}
					else{
						window.showInformationMessage("Built SoC!");
					}
					resolve();
				});
			});
			return p;
		});
	}
	else{
		return window.showErrorMessage("No workspace folder open.");
	}
}

function uploadSoC(){
	const buildFolder = getBuildFolder();

	if (!buildFolder){
		return window.showErrorMessage("No workspace folder open.");
	}

	const bitstreamPath = path.join(buildFolder, "gateware", "gsd_orangecrab.bit");

	if (!existsSync(bitstreamPath)){
		return window.showErrorMessage("No bitstream file found: You must compile the SoC first!")
	}

	const dfuArgs = [
		"-d", "1209:5af0",
		"-a", "0",
		"-D", bitstreamPath
	];

	return window.withProgress({
		location: ProgressLocation.Notification,
		title: "Uploading Bitstream",
		cancellable: false
	}, () => {	
		const p = new Promise<void>(resolve => {
			execFile("dfu-util", dfuArgs, {}, (error: ExecFileException | null) => {
				if (error){
					window.showErrorMessage(error.message);
				}
				else{
					window.showInformationMessage("Succesfully uploaded bitstream!");
				}
				resolve();
			});
		});
		return p;
	});
}