package com.reactclient;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;
import android.util.Log;

public class MyTaskService extends HeadlessJsTaskService {

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            // Logging that the method is executed
            Log.d("MyTaskService", "getTaskConfig executed");

            return new HeadlessJsTaskConfig(
                    "MyHeadlessTask",
                    Arguments.fromBundle(extras),
                    5000, // timeout in milliseconds for the task
                    true // optional: defines whether or not the task is allowed in foreground. Default is false
            );
        }
        return null;
    }
}