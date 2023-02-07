const { spawn } = require("child_process");

async function runPythonScript(argument: string) {
  return new Promise((resolve, reject) => {
    const process = spawn("python", ["dummy.py", argument]);
    let result = "";
  
    process.stdout.on("data", (data) => {
      result += data.toString();
    });
  
    process.on("close", (code) => {
      if (code !== 0) {
        reject(`Python script exited with code ${code}`);
      }
      resolve(result);
    });
  });
}

async function main() {
  try {
    const result = await runPythonScript("downloads");
    console.log(`${result}`);
    var val: number = Number(result)
    console.log((val*2).toString())
  } catch (error) {
    console.error(error);
  }
}

main();
