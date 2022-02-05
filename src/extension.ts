import { execFile, execFileSync, execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path = require('path');
import { commands, ExtensionContext, ProgressLocation, window, workspace } from 'vscode';

export function activate(context: ExtensionContext) {
	
	let disposable = commands.registerCommand('mfsc.compileSoC', () => {
		const workspaceFolders = workspace.workspaceFolders;

		if (workspaceFolders){
			const workspacePath = workspaceFolders[0].uri.path;
			var buildFolder = path.join(workspacePath, "build");

			// \c:\... --> c:\...
			if (process.platform === "win32" && buildFolder[0] === "\\"){
				buildFolder = buildFolder.slice(1);
			}

			if (!existsSync(buildFolder)){
				mkdirSync(buildFolder);
			}
			
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
				"--build",
				"--output-dir",
				"/project/"
			];

			return window.withProgress({
				location: ProgressLocation.Notification,
				title: "Building SoC",
				cancellable: false
			}, () => {	
				const p = new Promise<void>(async resolve => {
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
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}