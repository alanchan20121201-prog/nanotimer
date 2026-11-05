using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class NanoTimerLauncher
{
    private const int SandboxProbeMilliseconds = 2500;

    [STAThread]
    private static void Main(string[] args)
    {
        string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string appPath = Path.Combine(baseDirectory, "NanoTimerApp.exe");

        if (!File.Exists(appPath))
        {
            MessageBox.Show(
                "NanoTimerApp.exe was not found next to this launcher.",
                "NanoTimer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        try
        {
            Process sandboxed = StartApp(appPath, baseDirectory, args, false);

            // Windows 11 25H2 build 26200 terminates sandboxed Electron before
            // its first window. Try that path first, then fall back only when
            // the sandboxed process exits during startup.
            if (sandboxed != null && !sandboxed.WaitForExit(SandboxProbeMilliseconds))
            {
                for (int attempt = 0; attempt < 10; attempt++)
                {
                    Thread.Sleep(300);
                    sandboxed.Refresh();

                    if (sandboxed.HasExited)
                    {
                        break;
                    }

                    if (sandboxed.MainWindowHandle != IntPtr.Zero)
                    {
                        return;
                    }
                }

                try
                {
                    if (!sandboxed.HasExited)
                    {
                        sandboxed.Kill();
                    }
                }
                catch (Exception)
                {
                    // Fall through to the compatibility launch.
                }
            }

            Process fallback = StartApp(appPath, baseDirectory, args, true);
            if (fallback == null)
            {
                throw new InvalidOperationException("NanoTimerApp.exe could not start.");
            }
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "NanoTimer could not start:\n\n" + error.Message,
                "NanoTimer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private static string QuoteArgument(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "\"\"";
        }

        if (value.IndexOfAny(new[] { ' ', '\t', '\n', '\v', '"' }) < 0)
        {
            return value;
        }

        var quoted = new StringBuilder("\"");
        int backslashes = 0;

        foreach (char character in value)
        {
            if (character == '\\')
            {
                backslashes++;
                continue;
            }

            if (character == '"')
            {
                quoted.Append('\\', backslashes * 2 + 1);
                quoted.Append('"');
                backslashes = 0;
                continue;
            }

            quoted.Append('\\', backslashes);
            quoted.Append(character);
            backslashes = 0;
        }

        quoted.Append('\\', backslashes * 2);
        quoted.Append('"');
        return quoted.ToString();
    }

    private static Process StartApp(
        string appPath,
        string baseDirectory,
        string[] args,
        bool compatibilityMode)
    {
        var arguments = new StringBuilder(compatibilityMode ? "--no-sandbox" : string.Empty);

        foreach (string argument in args)
        {
            if (arguments.Length > 0)
            {
                arguments.Append(' ');
            }

            arguments.Append(QuoteArgument(argument));
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = appPath,
            Arguments = arguments.ToString(),
            WorkingDirectory = baseDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };

        startInfo.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");

        if (compatibilityMode)
        {
            startInfo.EnvironmentVariables["ELECTRON_DISABLE_SANDBOX"] = "1";
        }
        else
        {
            startInfo.EnvironmentVariables.Remove("ELECTRON_DISABLE_SANDBOX");
        }

        return Process.Start(startInfo);
    }
}
