import { execFile, execFileSync } from 'child_process';
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
				execFile("docker", args, {maxBuffer: 100 * 1024 * 1024}, (stdout) => {
					console.log(stdout);
					resolve();
				});
			});
			return p;
		}).then(() => {
			window.showInformationMessage("Built SoC!");
		});
	}
	else{
		return window.showErrorMessage("No workspace folder open.");
	}
}

function uploadSoC(){
	const dfuArgs = [
		"-d", "1209:5af0",
		"-a", "0",
		// "-D", "C:\Users\ben\OneDrive\Desktop\eggsample\build\gateware\gsd_orangecrab.bit"
	];

	const x = execFileSync("dfu-util", dfuArgs);
	const s = x.toString();
	console.log(s);
	window.showInformationMessage(s);
}