import preprocess from 'svelte-preprocess';

const config = {
    preprocess: preprocess({
        babel: {
          presets: [
            [
              '@babel/preset-env',
              {
                loose: true,
                // No need for babel to resolve modules
                modules: false,
                targets: {
                  // ! Very important. Target es6+
                  esmodules: true,
                },
              },
            ],
          ],
        },
      })
}

export default config;