declare module 'wordwrap' {
  type WordWrapParams = {
    mode?: 'soft';
    start?: number;
    stop?: number;
  };

  type WrapFunction = (text: string) => string;

  function wordwrap(params: WordWrapParams): WrapFunction;

  function wordwrap(start: number, params?: WordWrapParams): WrapFunction;

  function wordwrap(
    start: number,
    stop: number,
    params?: WordWrapParams,
  ): WrapFunction;

  export default wordwrap;
}
