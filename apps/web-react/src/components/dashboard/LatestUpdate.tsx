import type { API_latestUpdate } from '@repo/extra-types';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { ChevronDown, ChevronUp, LoaderCircle, NotebookText } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { apiBase } from '~/pages';
import moment from 'moment'
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

async function loadLatestUpdate(): Promise<AxiosResponse<API_latestUpdate>> {
  return axios.get<API_latestUpdate>(`${apiBase}/api/system/latest-update`);
}

const collapsedHeight = 240;

const LatestUpdate = () => {
  const [update, setUpdate] = useState<API_latestUpdate>()
  const [hasOverflow, setHasOverflow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (update) return;
    (async () => {
      const res = await loadLatestUpdate();
      setUpdate(res.data)
    })()
  }, [update])

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measureOverflow = () => {
      setHasOverflow(content.scrollHeight > collapsedHeight);
    };

    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(content);
    return () => observer.disconnect();
  }, [update])

  return (
    <div className="mb-6 mt-1 rounded-2xl px-4 py-3 text-sm text-white bg-[#211f1f]">
      {!update ? (
        <div className='flex flex-row items-center gap-2 justify-center animate-pulse'>
          <LoaderCircle className='animate-spin' /> Loading latest update information...
        </div>
      ) : (
        <>
          <div className="pb-2 flex flex-row items-start gap-2">
            <div className="flex flex-col">
              <div className='flex flex-row items-center gap-2'>
                <NotebookText aria-hidden="true" width={20} height={20} />
                <div className='flex flex-col items-start'>
                  <h1 className="font-extrabold text-xl">
                    {update.title}
                  </h1>
                  <span className="text-xs text-gray-300">~ {moment(update.datetime).fromNow()}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div
              aria-expanded={hasOverflow ? expanded : undefined}
              className="relative"
              style={{ maxHeight: hasOverflow && !expanded ? collapsedHeight : undefined, overflow: hasOverflow && !expanded ? 'hidden' : 'visible' }}
            >
              <article className="prose prose-sm dark:prose-invert max-w-none" id="latest-update-content" ref={contentRef}>
                <Markdown remarkPlugins={[remarkGfm]}>
                  {update.content}
                </Markdown>
              </article>
              {hasOverflow && !expanded ? (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#211f1f] via-[#211f1f]/75 to-transparent backdrop-blur-[2px]" />
              ) : null}
            </div>
            {hasOverflow ? (
              <button
                aria-controls="latest-update-content"
                aria-expanded={expanded}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#d6d0c9] transition hover:text-white"
                onClick={() => setExpanded((current) => !current)}
                type="button"
              >
                {expanded ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                {expanded ? 'Show less' : 'Show complete notes'}
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default LatestUpdate