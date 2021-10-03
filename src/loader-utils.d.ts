// the @types/loader-utils package is out-of-date,
// we should check the version later
declare module 'loader-utils' {
  import { LoaderContext } from 'webpack';

  export function getOptions<OptionsType>(
    loaderContext: LoaderContext<OptionsType>
  ): OptionsType;
}
