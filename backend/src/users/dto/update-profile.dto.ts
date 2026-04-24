import { IsOptional, IsString, IsDateString, IsEnum } from "class-validator";

export enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
}

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;
}