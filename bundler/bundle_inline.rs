// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

use std::path::PathBuf;
use std::sync::Arc;

use deno_core::error::AnyError;
use deno_core::futures::FutureExt;
use deno_core::resolve_url_or_path;

pub use deno_cli::args::BundleFlags;
use deno_cli::args::CliOptions;
pub use deno_cli::args::Flags;
use deno_cli::args::TsConfigType;
use deno_cli::args::TypeCheckMode;
use deno_cli::graph_util::create_graph_and_maybe_check;
use deno_cli::graph_util::error_for_any_npm_specifier;
use deno_cli::proc_state::ProcState;
use deno_cli::util::file_watcher::ResolutionResult;
use deno_emit::BundleEmit;

pub async fn bundle(
  flags: Flags,
  bundle_flags: BundleFlags,
) -> Result<BundleEmit, AnyError> {
  let cli_options = Arc::new(CliOptions::from_flags(flags)?);
  let resolver = |_| {
    let cli_options = cli_options.clone();
    let source_file1 = &bundle_flags.source_file;
    let source_file2 = &bundle_flags.source_file;
    async move {
      let module_specifier = resolve_url_or_path(source_file1)?;

      let ps = ProcState::from_options(cli_options).await?;
      let graph = create_graph_and_maybe_check(module_specifier, &ps).await?;

      let mut paths_to_watch: Vec<PathBuf> = graph
        .specifiers()
        .filter_map(|(_, r)| r.ok().and_then(|(s, _, _)| s.to_file_path().ok()))
        .collect();

      if let Ok(Some(import_map_path)) = ps
        .options
        .resolve_import_map_specifier()
        .map(|ms| ms.and_then(|ref s| s.to_file_path().ok()))
      {
        paths_to_watch.push(import_map_path);
      }

      Ok((paths_to_watch, graph, ps))
    }
    .map(move |result| match result {
      Ok((paths_to_watch, graph, ps)) => ResolutionResult::Restart {
        paths_to_watch,
        result: Ok((ps, graph)),
      },
      Err(e) => ResolutionResult::Restart {
        paths_to_watch: vec![PathBuf::from(source_file2)],
        result: Err(e),
      },
    })
  };

  let module_graph =
    if let ResolutionResult::Restart { result, .. } = resolver(Some(())).await {
      result.unwrap()
    } else {
      unreachable!();
    };

  let (ps, graph) = module_graph;

  error_for_any_npm_specifier(&graph).unwrap();
  let bundle_output = bundle_module_graph(graph.as_ref(), &ps).unwrap();

  Ok(bundle_output)
}

fn bundle_module_graph(
  graph: &deno_graph::ModuleGraph,
  ps: &ProcState,
) -> Result<deno_emit::BundleEmit, AnyError> {
  let ts_config_result = ps
    .options
    .resolve_ts_config_for_emit(TsConfigType::Bundle)?;
  if ps.options.type_check_mode() == TypeCheckMode::None {
    if let Some(ignored_options) = ts_config_result.maybe_ignored_options {
      eprintln!(
        "Warning: Ignoring options in tsconfig.json: {}",
        ignored_options.items.join(", ")
      );
    }
  }

  deno_emit::bundle_graph(
    graph,
    deno_emit::BundleOptions {
      bundle_type: deno_emit::BundleType::Module,
      emit_options: ts_config_result.ts_config.into(),
      emit_ignore_directives: true,
    },
  )
}
