import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { features, notificationRules } = await request.json();

    // Save feature configurations
    const { error: featuresError } = await supabase
      .from('student_panel_features')
      .upsert(
        features.map((feature: any) => ({
          id: feature.id,
          title: feature.title,
          enabled: feature.enabled,
          category: feature.category,
          priority: feature.priority,
          last_modified: new Date().toISOString(),
          affected_students: feature.affectedStudents
        })),
        { onConflict: 'id' }
      );

    if (featuresError) {
      console.error('Error saving features:', featuresError);
    }

    // Save notification rules
    const { error: rulesError } = await supabase
      .from('notification_rules')
      .upsert(
        notificationRules.map((rule: any) => ({
          id: rule.id,
          name: rule.name,
          trigger: rule.trigger,
          enabled: rule.enabled,
          target_class: rule.targetClass,
          message: rule.message,
          priority: rule.priority,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'id' }
      );

    if (rulesError) {
      console.error('Error saving notification rules:', rulesError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      featuresError: featuresError?.message,
      rulesError: rulesError?.message
    });
  } catch (error) {
    console.error('Error saving student controls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
