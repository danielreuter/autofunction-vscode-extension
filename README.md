# Autofunction

This extension operates in conjunction with the `autofunction` npm package.

It displays the compilation status of each autofunction directly in your code editor, right above each call to a compiler.

If the compiler has not been called yet since the last time you saved your workspace, then the status it displays will be "Not called yet." This is because it is unclear whether the autofunction needs to recompile until it is executed alongside the changes you've made. Once it is called in your application, this status will be replaced with a more informative one. 

If compilation was successful, then you can use "Paste code" to paste the AI-generated implementation into your file as a manual override. 

If compilation has failed, you can use "Copy error to clipboard" to copy an exhaustive set of execution traces from the compilation process to paste into a Markdown file to view, or into some chat assistant's context window to debug. 