import rateLimit from 'express-rate-limit';

const isTestEnv = () => process.env.NODE_ENV === 'test';

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTestEnv(),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message
      });
    }
  });
}

export const analyzeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many test-plan analysis requests. Please wait a minute before trying again.'
});

export const explainLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many failure-diagnosis requests. Please wait a minute before trying again.'
});

export const verifyKeyLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many API key verification attempts. Please wait a minute before trying again.'
});

export const openApiImportLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many API specification imports. Please wait a minute before trying again.'
});
