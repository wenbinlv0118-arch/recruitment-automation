const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  static log(message, ...args) {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  }

  static error(message, ...args) {
    console.error(message, ...args);
  }

  static warn(message, ...args) {
    console.warn(message, ...args);
  }

  static info(message, ...args) {
    if (isDevelopment) {
      console.info(message, ...args);
    }
  }

  static debug(message, ...args) {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  }
}

export default Logger; 