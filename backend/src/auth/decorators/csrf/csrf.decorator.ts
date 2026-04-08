import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTED_KEY = 'csrf-protected';

export const CsrfProtected = () => SetMetadata(CSRF_PROTECTED_KEY, true);