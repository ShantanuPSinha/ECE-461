/**
 * ECE 461 - Spring 2023 - Project 2
 * API for ECE 461/Spring 2023/Project 2: A Trustworthy Module Registry
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: davisjam@purdue.edu
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { User } from './user';
import { PackageMetadata } from './packageMetadata';


/**
 * One entry of the history of this package.
 */
export interface PackageHistoryEntry { 
    User: User;
    /**
     * Date of activity.
     */
    Date: string;
    PackageMetadata: PackageMetadata;
    /**
     * 
     */
    Action: PackageHistoryEntry.ActionEnum;
}
export namespace PackageHistoryEntry {
    export type ActionEnum = 'CREATE' | 'UPDATE' | 'DOWNLOAD' | 'RATE';
    export const ActionEnum = {
        Create: 'CREATE' as ActionEnum,
        Update: 'UPDATE' as ActionEnum,
        Download: 'DOWNLOAD' as ActionEnum,
        Rate: 'RATE' as ActionEnum
    };
}


